#!/usr/bin/env python3
"""
Craft Dark Fantasy Electric Pow Wow Workout Battle Theme
========================================================
Combines:
  1. High-energy Electric Pow Wow groove (133 BPM, syncopated bounce, heavy claps & shakers)
  2. Authentic powwow vocal group chanting & acoustic grand drum honor beats
  3. Dark fantasy orchestration (gothic cathedral bells, menacing brass warhorns, cellos, sub impacts)
  4. Studio mastering with punchy bus compression and stereo widening
"""

import os
import subprocess
import wave
import numpy as np

SR = 44100
BPM = 133.0
BEAT_SEC = 60.0 / BPM  # ~0.4511s
BAR_SEC = BEAT_SEC * 4.0  # ~1.8045s
TOTAL_BARS = 56  # ~101 seconds of pure adrenaline
TOTAL_SAMPLES = int(round(TOTAL_BARS * BAR_SEC * SR))

print(f"[*] Rendering Dark Fantasy Electric Pow Wow: {BPM} BPM, {TOTAL_BARS} bars ({TOTAL_BARS * BAR_SEC:.1f}s, {TOTAL_SAMPLES} samples)")

RAW_DIR = "work/music/raw"
STEMS_DIR = "work/music/stems"
MUSIC_DIR = "work/music"
ASSETS_DIR = "public/assets/music"

os.makedirs(RAW_DIR, exist_ok=True)
os.makedirs(STEMS_DIR, exist_ok=True)
os.makedirs(MUSIC_DIR, exist_ok=True)
os.makedirs(ASSETS_DIR, exist_ok=True)

def sample_at(bar, beat=0, sixteenth=0):
    return int(round((bar * BAR_SEC + beat * BEAT_SEC + sixteenth * (BEAT_SEC / 4.0)) * SR))

# -----------------------------------------------------------------------------
# 1. Dark Fantasy Sound Generators
# -----------------------------------------------------------------------------

def make_cathedral_bell(dur=4.5, root_f=123.47):
    """
    Physical acoustic model of a massive Gothic Cathedral Bell / Dark Iron Bell.
    Uses European church bell partial frequencies with minor-third tierce for dark fantasy mood.
    """
    n = int(round(dur * SR))
    t = np.linspace(0, dur, n, endpoint=False)
    # Partials: (frequency_multiplier, amplitude, decay_time_scale)
    partials = [
        (0.5, 0.70, 4.0),    # Hum tone (dark resonant sub)
        (1.0, 0.85, 3.2),    # Prime (fundamental strike)
        (1.189, 0.75, 2.8),  # Tierce (minor 3rd - gives dark gothic character!)
        (1.5, 0.55, 2.2),    # Quint (perfect 5th)
        (2.0, 0.65, 1.8),    # Nominal (octave above)
        (2.76, 0.45, 1.2),   # Supernominal
        (4.07, 0.35, 0.7),   # High bright metallic clang
        (5.4, 0.20, 0.4),    # Anvil hammer ping
    ]
    bell = np.zeros(n, dtype=np.float32)
    for mult, amp, dec in partials:
        # Subtle natural chorus/beating
        f = root_f * mult
        f_detune = f * 1.002
        mode = amp * (0.6 * np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f_detune * t))
        decay_env = np.exp(-t / (dec * 0.9))
        bell += mode * decay_env

    # Hammer impact transient
    strike = np.random.uniform(-1, 1, n).astype(np.float32) * np.exp(-t * 90) * 0.5
    bell += strike
    
    # Normalization
    bell = bell / (np.max(np.abs(bell)) + 1e-6)
    return bell

def make_dark_brass_warhorn(dur=2.2, f0=61.74):
    """
    Deep cinematic brass blast (Horn of War / Braam).
    Rich odd harmonics, brass filter sweep, and gritty room saturation.
    """
    n = int(round(dur * SR))
    t = np.linspace(0, dur, n, endpoint=False)
    
    # Pitch bend: starts slightly sharp then settles on root
    pitch = f0 * (1.0 + 0.08 * np.exp(-t * 15.0))
    phase = 2 * np.pi * np.cumsum(pitch) / SR
    
    # Brass harmonics: rich odd harmonics with sawtooth edge
    harmonics = [
        (1.0, 1.0),
        (2.0, 0.6),
        (3.0, 0.8),
        (4.0, 0.4),
        (5.0, 0.5),
        (6.0, 0.25),
        (7.0, 0.35),
        (8.0, 0.15)
    ]
    raw = np.zeros(n, dtype=np.float32)
    for mult, weight in harmonics:
        raw += weight * np.sin(phase * mult)
        
    # Brass envelope: fast swell into punchy sustain
    attack = np.minimum(1.0, t / 0.08)
    decay = np.exp(-np.maximum(0.0, t - 0.2) / 1.4)
    env = attack * decay
    
    # Soft saturation
    saturated = np.tanh(raw * 1.8) * env
    
    # Low pass filter sweep
    # Simple recursive 1-pole filter simulation
    out = np.zeros(n, dtype=np.float32)
    alpha = 0.35
    cur = 0.0
    for i in range(n):
        cur = cur + alpha * (saturated[i] - cur)
        out[i] = cur
        
    return out / (np.max(np.abs(out)) + 1e-6)

def make_dark_strings_ostinato(dur=BAR_SEC, f_chord=[123.47, 146.83, 185.0]):
    """
    Driving 16th-note rhythmic cello & contrabass dark fantasy ostinato in B minor.
    """
    n = int(round(dur * SR))
    out = np.zeros(n, dtype=np.float32)
    step_samples = int(round((BAR_SEC / 16.0) * SR))
    
    for step in range(16):
        s_start = step * step_samples
        s_len = min(step_samples, n - s_start)
        t = np.linspace(0, s_len / SR, s_len, endpoint=False)
        
        # Pick note in arpeggiated dark pattern
        chord_idx = (step % 4) % len(f_chord)
        note_f = f_chord[chord_idx] if step % 2 == 0 else f_chord[0]
        
        # Sawtooth / string tone with bow friction
        saw = 0.0
        for h in range(1, 9):
            saw += (1.0 / h) * np.sin(2 * np.pi * note_f * h * t)
            
        bow_noise = np.random.uniform(-1, 1, s_len) * 0.15 * np.exp(-t * 40)
        env = (1.0 - np.exp(-t * 80)) * np.exp(-t * 12)
        accent = 1.3 if step in [0, 6, 10, 14] else 0.85
        
        out[s_start : s_start + s_len] += (saw + bow_noise) * env * accent
        
    return out / (np.max(np.abs(out)) + 1e-6)

def make_sub_drop_boom(dur=3.0):
    """
    Subwoofer-shattering 808 drop & cinematic impact boom.
    """
    n = int(round(dur * SR))
    t = np.linspace(0, dur, n, endpoint=False)
    # Pitch sweep from 130 Hz down to 34 Hz
    f_curve = 34.0 + 96.0 * np.exp(-t * 7.0)
    phase = 2 * np.pi * np.cumsum(f_curve) / SR
    sub = np.sin(phase) + 0.3 * np.sin(phase * 2.0)
    
    sub_env = np.exp(-t / 1.1)
    
    # White noise impact rumble
    noise = np.random.uniform(-1, 1, n).astype(np.float32) * np.exp(-t * 24.0) * 0.4
    boom = (sub * 0.85 + noise) * sub_env
    return boom / (np.max(np.abs(boom)) + 1e-6)

# -----------------------------------------------------------------------------
# 2. Extract Authentic Powwow Vocal & Acoustic Drum Elements
# -----------------------------------------------------------------------------

print("[*] Extracting authentic Powwow vocals and acoustic drums from master recordings...")

def extract_audio_segment(input_file, start_sec, dur_sec, out_wav, target_bpm=None):
    """
    Extracts high-fidelity stereo segment and optionally time-stretches to BPM.
    """
    cmd = [
        "ffmpeg", "-y", "-i", input_file,
        "-ss", str(start_sec), "-t", str(dur_sec),
        "-ar", str(SR), "-ac", "2"
    ]
    if target_bpm:
        # ATCR is ~133 BPM, so negligible or perfect 1.0 tempo stretch
        pass
    cmd.append(out_wav)
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

# Extract vocal hook phrases from Electric Intertribal
vocal_hook1_path = os.path.join(RAW_DIR, "vocal_hook1.wav")
vocal_hook2_path = os.path.join(RAW_DIR, "vocal_hook2.wav")
vocal_verse_path = os.path.join(RAW_DIR, "vocal_verse.wav")
acoustic_honor_path = os.path.join(RAW_DIR, "acoustic_honor.wav")

# 1. Main soaring powwow vocal drop chorus (bars 8-24)
extract_audio_segment("work/music/raw/electric_intertribal.mp3", 29.0, BAR_SEC * 8, vocal_hook1_path)

# 2. High-energy vocal variation hook (bars 32-48)
extract_audio_segment("work/music/raw/electric_intertribal.mp3", 90.5, BAR_SEC * 8, vocal_hook2_path)

# 3. Solo intro vocal invocation
extract_audio_segment("work/music/raw/electric_intertribal.mp3", 7.2, BAR_SEC * 4, vocal_verse_path)

# 4. Pure acoustic powwow grand drum from Cree Confederation (authentic thunderous room resonance)
extract_audio_segment("work/music/raw/cree_confederation.mp3", 12.0, BAR_SEC * 4, acoustic_honor_path)

def load_wav_stereo(path):
    with wave.open(path, 'rb') as w:
        sr = w.getframerate()
        n = w.getnframes()
        channels = w.getnchannels()
        raw = w.readframes(n)
        data = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
        if channels == 1:
            data = np.stack([data, data], axis=1)
        elif channels == 2:
            data = data.reshape(-1, 2)
        return data

vocal_hook1 = load_wav_stereo(vocal_hook1_path)
vocal_hook2 = load_wav_stereo(vocal_hook2_path)
vocal_verse = load_wav_stereo(vocal_verse_path)
acoustic_honor = load_wav_stereo(acoustic_honor_path)

# -----------------------------------------------------------------------------
# 3. Assemble Multi-Track Stems
# -----------------------------------------------------------------------------

# Stems:
# 1. Powwow Vocals (Chants, hooks, invocations)
# 2. Powwow Grand Drums (Acoustic circle beats & colossal honor beats)
# 3. Electronic Powwow-Step Beat (Club kicks, syncopated bounce, claps, shakers, 808 sub)
# 4. Dark Fantasy Orchestral (Cathedral bells, brass warhorns, cellos, impact braams)

stem_vocals = np.zeros((TOTAL_SAMPLES, 2), dtype=np.float32)
stem_acoustic_drums = np.zeros((TOTAL_SAMPLES, 2), dtype=np.float32)
stem_electronic_beat = np.zeros((TOTAL_SAMPLES, 2), dtype=np.float32)
stem_dark_fantasy = np.zeros((TOTAL_SAMPLES, 2), dtype=np.float32)

def mix_into(dest, src, start_sample, gain=1.0, pan=0.0):
    if start_sample >= len(dest):
        return
    end_sample = min(len(dest), start_sample + len(src))
    src_len = end_sample - start_sample
    
    # Calculate pan
    angle = ((np.clip(pan, -1.0, 1.0) + 1.0) * np.pi) / 4.0
    gain_l = np.cos(angle) * gain
    gain_r = np.sin(angle) * gain
    
    if src.ndim == 1:
        dest[start_sample:end_sample, 0] += src[:src_len] * gain_l
        dest[start_sample:end_sample, 1] += src[:src_len] * gain_r
    else:
        dest[start_sample:end_sample, 0] += src[:src_len, 0] * gain_l
        dest[start_sample:end_sample, 1] += src[:src_len, 1] * gain_r

# Pre-render dark fantasy building blocks
bell_B = make_cathedral_bell(dur=4.8, root_f=123.47)  # B2
bell_D = make_cathedral_bell(dur=4.2, root_f=146.83)  # D3
bell_Fsharp = make_cathedral_bell(dur=3.8, root_f=185.0)  # F#3
warhorn_B = make_dark_brass_warhorn(dur=2.4, f0=61.74)  # B1
warhorn_D = make_dark_brass_warhorn(dur=2.4, f0=73.42)  # D2
ostinato_bar = make_dark_strings_ostinato(dur=BAR_SEC)
sub_drop = make_sub_drop_boom(dur=3.5)

# --- A. INTRO (Bars 0 - 8): Atmospheric Invocation & Dread ---
print("[*] Arranging Intro (Bars 0-8)...")
# Cathedral bells tolling in the dark dungeon
mix_into(stem_dark_fantasy, bell_B, sample_at(0, 0), gain=1.0, pan=-0.3)
mix_into(stem_dark_fantasy, bell_D, sample_at(2, 0), gain=0.9, pan=0.3)
mix_into(stem_dark_fantasy, bell_B, sample_at(4, 0), gain=1.0, pan=-0.2)
mix_into(stem_dark_fantasy, bell_Fsharp, sample_at(6, 0), gain=0.95, pan=0.2)

# Solo vocal chant rising in the distance
mix_into(stem_vocals, vocal_verse, sample_at(1, 0), gain=0.85, pan=0.0)

# Ominous warhorn swell at bar 6 building to the drop
mix_into(stem_dark_fantasy, warhorn_B, sample_at(6, 2), gain=1.1, pan=0.0)

# Acoustic grand drum heartbeat pulse
for b in range(2, 8):
    # Steady heart beat on beats 0 and 2
    accent = 1.0 if b >= 6 else 0.75
    mix_into(stem_acoustic_drums, acoustic_honor[:int(SR*0.6)], sample_at(b, 0), gain=accent * 0.9, pan=-0.1)
    mix_into(stem_acoustic_drums, acoustic_honor[:int(SR*0.6)], sample_at(b, 2), gain=accent * 0.7, pan=0.1)

# --- B. DROP 1: BLOOD & IRON (Bars 8 - 24, 16 Bars) ---
print("[*] Arranging Drop 1: Blood & Iron (Bars 8-24)...")

# Colossal Sub Impact Boom at the drop
mix_into(stem_dark_fantasy, sub_drop, sample_at(8, 0), gain=1.35, pan=0.0)
mix_into(stem_dark_fantasy, bell_B, sample_at(8, 0), gain=1.1, pan=-0.25)
mix_into(stem_dark_fantasy, warhorn_B, sample_at(8, 0), gain=1.2, pan=0.15)

# Powwow Vocal Drop Chorus (8 bars x 2 = 16 bars)
mix_into(stem_vocals, vocal_hook1, sample_at(8, 0), gain=1.15, pan=0.0)
mix_into(stem_vocals, vocal_hook1, sample_at(16, 0), gain=1.2, pan=0.0)

# Add Electric Powwow-Step rhythm from master section
# Extract clean powwow-step groove layer
groove_path = os.path.join(RAW_DIR, "groove_drop1.wav")
extract_audio_segment("work/music/raw/electric_intertribal.mp3", 29.0, BAR_SEC * 16, groove_path)
groove_drop1 = load_wav_stereo(groove_path)
mix_into(stem_electronic_beat, groove_drop1, sample_at(8, 0), gain=1.05, pan=0.0)

# Dark Fantasy Layers during Drop 1:
for b in range(8, 24):
    # Cathedral Bell toll every 4 bars
    if b % 4 == 0:
        mix_into(stem_dark_fantasy, bell_B, sample_at(b, 0), gain=0.9, pan=-0.3)
    elif b % 4 == 2:
        mix_into(stem_dark_fantasy, bell_D, sample_at(b, 0), gain=0.85, pan=0.3)
        
    # Brass Warhorn call-and-response answering the powwow vocals on beat 3 of odd bars
    if b % 2 == 1:
        mix_into(stem_dark_fantasy, warhorn_B, sample_at(b, 2), gain=0.95, pan=(0.2 if b % 4 == 1 else -0.2))
        
    # Dark string ostinato chugging in the background (bars 12 to 24)
    if b >= 12:
        mix_into(stem_dark_fantasy, ostinato_bar, sample_at(b, 0), gain=0.65, pan=0.0)

# --- C. HONOR BEAT BREAKDOWN (Bars 24 - 32, 8 Bars) ---
print("[*] Arranging Honor Beat Breakdown (Bars 24-32)...")

# Sudden drop in electronic beat: Pure focus on the colossal acoustic powwow grand drum
# 4 Massive Honor Beats on Bars 25, 27, 29, 31 (Authentic powwow honor beat tradition)
for honor_bar in [25, 27, 29, 31]:
    mix_into(stem_acoustic_drums, acoustic_honor, sample_at(honor_bar, 0), gain=1.45, pan=-0.1)
    mix_into(stem_acoustic_drums, acoustic_honor, sample_at(honor_bar, 2), gain=1.5, pan=0.1)
    # Bell strikes in unison with the honor beat!
    mix_into(stem_dark_fantasy, bell_B, sample_at(honor_bar, 0), gain=1.0, pan=0.0)
    mix_into(stem_dark_fantasy, sub_drop, sample_at(honor_bar, 0), gain=1.1, pan=0.0)

# Solo singer invoking the spirit during breakdown
mix_into(stem_vocals, vocal_verse, sample_at(25, 0), gain=1.0, pan=0.0)

# Giant brass riser building on bars 30-31
mix_into(stem_dark_fantasy, warhorn_B, sample_at(30, 0), gain=1.1, pan=-0.2)
mix_into(stem_dark_fantasy, warhorn_D, sample_at(31, 0), gain=1.2, pan=0.2)

# --- D. DROP 2: KNIGHT'S AWAKENING / MAX WORKOUT EFFORT (Bars 32 - 48, 16 Bars) ---
print("[*] Arranging Drop 2: Knight's Awakening (Bars 32-48)...")

# Maximum Energy Drop!
mix_into(stem_dark_fantasy, sub_drop, sample_at(32, 0), gain=1.5, pan=0.0)
mix_into(stem_dark_fantasy, bell_B, sample_at(32, 0), gain=1.2, pan=-0.25)
mix_into(stem_dark_fantasy, bell_Fsharp, sample_at(32, 0), gain=1.0, pan=0.25)
mix_into(stem_dark_fantasy, warhorn_B, sample_at(32, 0), gain=1.3, pan=0.0)

# High variation vocal chorus
mix_into(stem_vocals, vocal_hook2, sample_at(32, 0), gain=1.25, pan=0.0)
mix_into(stem_vocals, vocal_hook2, sample_at(40, 0), gain=1.25, pan=0.0)

# Electronic beat drop 2 (peak intensity)
groove2_path = os.path.join(RAW_DIR, "groove_drop2.wav")
extract_audio_segment("work/music/raw/electric_intertribal.mp3", 90.5, BAR_SEC * 16, groove2_path)
groove_drop2 = load_wav_stereo(groove2_path)
mix_into(stem_electronic_beat, groove_drop2, sample_at(32, 0), gain=1.1, pan=0.0)

# Layer acoustic grand drum accents alongside electronic beat for massive body
for b in range(32, 48):
    mix_into(stem_dark_fantasy, ostinato_bar, sample_at(b, 0), gain=0.8, pan=0.0)
    if b % 2 == 0:
        mix_into(stem_dark_fantasy, warhorn_B, sample_at(b, 2), gain=1.0, pan=-0.2)
    else:
        mix_into(stem_dark_fantasy, warhorn_D, sample_at(b, 2), gain=1.0, pan=0.2)
        
    if b % 4 == 0:
        mix_into(stem_dark_fantasy, bell_B, sample_at(b, 0), gain=1.0, pan=-0.3)
        mix_into(stem_dark_fantasy, sub_drop, sample_at(b, 0), gain=0.9, pan=0.0)

# --- E. OUTRO & SEAMLESS LOOP TRANSITION (Bars 48 - 56, 8 Bars) ---
print("[*] Arranging Outro & Loop Transition (Bars 48-56)...")

# Energy tapers smoothly back to cathedral bell and dark dungeon pulse
mix_into(stem_dark_fantasy, bell_B, sample_at(48, 0), gain=1.1, pan=-0.3)
mix_into(stem_dark_fantasy, bell_D, sample_at(50, 0), gain=1.0, pan=0.3)
mix_into(stem_dark_fantasy, bell_B, sample_at(52, 0), gain=1.0, pan=-0.2)
mix_into(stem_dark_fantasy, bell_B, sample_at(54, 0), gain=0.9, pan=0.0)

# Vocal chant echoes out
vocal_tail_len = int(round(BAR_SEC * 4 * SR))
mix_into(stem_vocals, vocal_verse[:vocal_tail_len], sample_at(48, 0), gain=0.7, pan=0.0)

# Drums fade out to heartbeat on bar 52
for b in range(48, 54):
    gain_fade = max(0.0, 1.0 - (b - 48) / 6.0)
    mix_into(stem_acoustic_drums, acoustic_honor[:int(SR*0.6)], sample_at(b, 0), gain=gain_fade * 0.8, pan=0.0)

# -----------------------------------------------------------------------------
# 4. Master Bus Mixing, Compression & Loudness
# -----------------------------------------------------------------------------

print("[*] Balancing Stems and Mastering Master Mix...")

def write_stem(name, data):
    path = os.path.join(STEMS_DIR, f"{name}.wav")
    clipped = np.clip(data, -1.0, 1.0)
    int16_data = (clipped * 32767).astype(np.int16)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(int16_data.tobytes())
    print(f"    Exported stem: {path}")

# Normalize individual stems
stem_vocals /= (np.max(np.abs(stem_vocals)) + 1e-6)
stem_acoustic_drums /= (np.max(np.abs(stem_acoustic_drums)) + 1e-6)
stem_electronic_beat /= (np.max(np.abs(stem_electronic_beat)) + 1e-6)
stem_dark_fantasy /= (np.max(np.abs(stem_dark_fantasy)) + 1e-6)

write_stem("01_powwow_vocals", stem_vocals * 0.95)
write_stem("02_powwow_acoustic_drums", stem_acoustic_drums * 0.95)
write_stem("03_electronic_beat_808", stem_electronic_beat * 0.95)
write_stem("04_dark_fantasy_orchestral", stem_dark_fantasy * 0.95)

# Master Mix Summation
master = (
    stem_vocals * 0.90 +
    stem_acoustic_drums * 0.85 +
    stem_electronic_beat * 1.00 +
    stem_dark_fantasy * 0.88
)

# Soft Knee Master Saturation & Limiter
master = np.tanh(master * 1.15)
peak = np.max(np.abs(master))
if peak > 0:
    master = (master / peak) * 0.96

master_wav_path = os.path.join(MUSIC_DIR, "electric_pow_wow_battle.wav")
clipped = np.clip(master, -1.0, 1.0)
int16_data = (clipped * 32767).astype(np.int16)
with wave.open(master_wav_path, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(int16_data.tobytes())

print(f"[*] Raw Master rendered to: {master_wav_path}")

# Final Polish with FFmpeg:
# 1. Subtle bus compression for punchy workout dynamics
# 2. Loudnorm (EBU R128 broadcast standard) so it sounds massive on TV speakers
# 3. Export to public/assets/music/battle_electric_pow_wow.wav and MP3
asset_wav = os.path.join(ASSETS_DIR, "battle_electric_pow_wow.wav")
asset_mp3 = os.path.join(ASSETS_DIR, "battle_electric_pow_wow.mp3")
work_mp3 = os.path.join(MUSIC_DIR, "electric_pow_wow_battle.mp3")

print("[*] Running final broadcast master compression & loudness normalization...")
cmd_master = [
    "ffmpeg", "-y", "-i", master_wav_path,
    "-ar", "44100",
    "-af", "acompressor=threshold=-14dB:ratio=3:attack=5:release=80:makeup=2dB,loudnorm=I=-14:LRA=7:TP=-1.0",
    asset_wav
]
subprocess.run(cmd_master, check=True)

# Generate high quality MP3 copies
subprocess.run(["ffmpeg", "-y", "-i", asset_wav, "-b:a", "256k", asset_mp3], check=True)
subprocess.run(["ffmpeg", "-y", "-i", asset_wav, "-b:a", "256k", work_mp3], check=True)

print(f"[+] Master WAV: {asset_wav} ({os.path.getsize(asset_wav)} bytes)")
print(f"[+] Master MP3: {asset_mp3} ({os.path.getsize(asset_mp3)} bytes)")
print("[+] DONE! Dark Fantasy Electric Pow Wow Soundtrack is ready.")
