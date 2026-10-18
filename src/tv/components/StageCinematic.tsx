import React, { useState, useEffect, useRef } from 'react';
import { BattleMapId } from '../../types/battle';
import { getStageLore, StageLore, CinematicScene } from '../../shared/stageLore';
import { BATTLE_MAPS } from '../engine/battleMaps';
import { audioManager } from '../../shared/AudioManager';
import { useTVRemote } from '../hooks/useTVRemote';

interface StageCinematicProps {
  mapId: BattleMapId;
  onClose: () => void;
  onEmbark?: () => void;
}

type Mood = CinematicScene['mood'];

/** Accent colour and label per scene mood: aged gold, dried blood, void violet, spectral teal, cold steel. */
const MOOD: Record<Mood, { accent: string; glow: string; label: string }> = {
  former_glory: { accent: '#D9B45A', glow: 'rgba(217, 180, 90, 0.35)', label: 'Ancient Glory' },
  ruin: { accent: '#C2483E', glow: 'rgba(194, 72, 62, 0.35)', label: 'The Ruin & Rot' },
  apex_terror: { accent: '#A77BE0', glow: 'rgba(167, 123, 224, 0.35)', label: 'Apex Terror' },
  legend: { accent: '#7FD8C8', glow: 'rgba(127, 216, 200, 0.3)', label: 'Whispered Legend' },
  iron_vow: { accent: '#93B7D6', glow: 'rgba(147, 183, 214, 0.35)', label: 'Sacrament of Iron' },
};

const PARCHMENT = '#ECE2CA';
const PARCHMENT_DIM = '#A99F88';
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
const WORD_MS = 55;
/** Chapter change: the curtain closes over the old art, the art swaps, then it opens (kkCineCurtain in index.css). */
const CURTAIN_COVER_MS = 300;
/** Hands-off pacing: after the text is in, hold long enough to read it, then turn the page. */
const HOLD_PER_WORD_S = 0.3;
const HOLD_EPIGRAPH_S = 3;
const HOLD_MIN_S = 5;
const HOLD_MAX_S = 15;
const TEXT_SHADOW = '0 2px 14px rgba(0,0,0,0.95), 0 0 3px rgba(0,0,0,0.9)';

const EMBERS = Array.from({ length: 10 }, (_, i) => ({
  left: `${(i * 37 + 11) % 100}%`,
  duration: `${9 + ((i * 7) % 8)}s`,
  delay: `${-((i * 3.7) % 14)}s`,
  size: i % 3 === 0 ? 4 : 2,
}));

/** "PROLOGUE: THE WEARY BOUGHS" → kicker "Prologue", title "The Weary Boughs". */
function splitChapter(chapter: string): { kicker: string; title: string } {
  const at = chapter.indexOf(':');
  if (at < 0) return { kicker: '', title: chapter };
  return { kicker: chapter.slice(0, at).trim(), title: chapter.slice(at + 1).trim() };
}

const Ornament: React.FC<{ color: string; flip?: boolean }> = ({ color, flip }) => (
  <svg
    width="120"
    height="10"
    viewBox="0 0 120 10"
    className="shrink-0"
    style={{ transform: flip ? 'scaleX(-1)' : undefined }}
    aria-hidden
  >
    <line x1="0" y1="5" x2="104" y2="5" stroke={color} strokeOpacity="0.55" strokeWidth="1" />
    <line x1="60" y1="5" x2="104" y2="5" stroke={color} strokeWidth="1" />
    <rect x="108" y="1.5" width="7" height="7" transform="rotate(45 111.5 5)" fill="none" stroke={color} strokeWidth="1" />
    <circle cx="111.5" cy="5" r="1.2" fill={color} />
  </svg>
);

export const StageCinematic: React.FC<StageCinematicProps> = ({ mapId, onClose, onEmbark }) => {
  const lore: StageLore = getStageLore(mapId);
  const [sceneIndex, setSceneIndex] = useState<number>(0);
  const [shownWords, setShownWords] = useState<number>(0);
  /** The chapter whose art is on screen; it trails sceneIndex until the curtain has covered the old art. */
  const [artIndex, setArtIndex] = useState<number>(0);
  const [curtain, setCurtain] = useState<number>(0);
  const [readyArt, setReadyArt] = useState<ReadonlySet<string>>(() => new Set());
  const timerRef = useRef<number | null>(null);

  const scene: CinematicScene = lore.scenes[sceneIndex] || lore.scenes[0];
  const mood = MOOD[scene.mood];
  const artFor = (s: CinematicScene) => s.image || BATTLE_MAPS[mapId] || BATTLE_MAPS.VERDANT_FOREST;
  const art = artFor(lore.scenes[artIndex] || lore.scenes[0]);
  const words = scene.text.join(' ').split(/\s+/);
  const isTypingComplete = shownWords >= words.length;
  const isFinalScene = sceneIndex === lore.scenes.length - 1;
  const { kicker, title } = splitChapter(scene.chapter);

  // Fetch and decode every chapter's art up front. Without this a chapter's image only starts downloading when its
  // page turns, and the fade-in reveals it half-painted (progressive JPEGs draw top-down) on a cold cache.
  useEffect(() => {
    let alive = true;
    const srcs = [...new Set(lore.scenes.map(artFor))];
    const imgs = srcs.map((src) => {
      const img = new Image();
      img.src = src;
      const done = () => alive && setReadyArt((prev) => new Set(prev).add(src));
      img.decode().then(done, done); // a broken image still unblocks its chapter
      return img;
    });
    return () => {
      alive = false;
      imgs.forEach((img) => (img.src = ''));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapId, lore]);

  // Swap the art once the curtain is fully down, so the new image never has to fade in on its own
  useEffect(() => {
    if (artIndex === sceneIndex) return;
    const t = window.setTimeout(() => setArtIndex(sceneIndex), CURTAIN_COVER_MS);
    return () => clearTimeout(t);
  }, [sceneIndex, artIndex]);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    audioManager.playBgm('/assets/music/cinematic_prologue.mp3', 0.75);
    audioManager.play('ui_select');
    return stopTimer;
  }, [mapId]);

  // Ink-in narration: words fade up one at a time, without reflowing the paragraph
  useEffect(() => {
    setShownWords(0);
    stopTimer();
    let n = 0;
    const total = words.length;
    timerRef.current = window.setInterval(() => {
      n += 1;
      setShownWords(n);
      if (n % 4 === 0) audioManager.play('ui_move', { vol: 0.07, rate: 0.8 });
      if (n >= total) stopTimer();
    }, WORD_MS);
    return stopTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneIndex, mapId]);

  const goTo = (idx: number) => {
    if (idx === sceneIndex || idx < 0 || idx >= lore.scenes.length) return;
    setCurtain((c) => c + 1);
    setSceneIndex(idx);
  };

  const handleNext = () => {
    if (!isTypingComplete) {
      stopTimer();
      setShownWords(words.length);
      audioManager.play('ui_select');
      return;
    }
    if (!isFinalScene) {
      goTo(sceneIndex + 1);
      audioManager.play('card');
    } else {
      audioManager.play('equip');
      (onEmbark ?? onClose)();
    }
  };

  const handlePrev = () => {
    if (sceneIndex > 0) {
      goTo(sceneIndex - 1);
      audioManager.play('ui_move');
    }
  };

  const handleNextChapter = () => {
    if (!isFinalScene) {
      goTo(sceneIndex + 1);
      audioManager.play('card');
    }
  };

  useTVRemote({
    onSelect: handleNext,
    onBack: onClose,
    onRight: handleNextChapter,
    onLeft: handlePrev,
  });

  const epigraph =
    scene.mood === 'apex_terror' ? lore.apexTerror : scene.mood === 'iron_vow' ? `“${lore.penanceVow}”` : null;

  const holdSeconds = Math.min(
    HOLD_MAX_S,
    Math.max(HOLD_MIN_S, words.length * HOLD_PER_WORD_S + (epigraph ? HOLD_EPIGRAPH_S : 0)),
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black select-none overflow-hidden cursor-pointer"
      onClick={handleNext}
    >
      {/* ART: slow drift, crossfading between chapters */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Art stays fully opaque: a huge layer that fades itself in from opacity 0 can be left
            half-painted by Chrome's compositor. Fades are done by the black curtain over it instead. */}
        {readyArt.has(art) && (
          <img
            key={`art-${artIndex}`}
            src={art}
            alt=""
            draggable={false}
            className={`kk-cine-art ${artIndex % 2 ? 'kk-cine-art--b' : ''}`}
          />
        )}
        <div
          key={`curtain-${curtain}`}
          className={`absolute inset-0 bg-black ${curtain ? 'kk-cine-curtain' : 'kk-cine-curtain--open'}`}
        />

        {/* Shade: heavy floor of darkness for the text, lighter crown, vignette, mood-tinted underglow */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.88) 22%, rgba(0,0,0,0.45) 44%, rgba(0,0,0,0) 62%),' +
              'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 26%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.75) 100%)' }}
        />
        <div
          className="absolute inset-0 transition-[background] duration-1000"
          style={{ background: `radial-gradient(ellipse 70% 40% at 50% 100%, ${mood.glow}, rgba(0,0,0,0) 70%)` }}
        />

        {/* Drifting embers */}
        {EMBERS.map((e, i) => (
          <span
            key={i}
            className="kk-cine-ember"
            style={{
              left: e.left,
              width: e.size,
              height: e.size,
              background: mood.accent,
              boxShadow: `0 0 6px ${mood.accent}`,
              animationDuration: e.duration,
              animationDelay: e.delay,
            }}
          />
        ))}

        {/* Film grain via scanlines, kept faint */}
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent 0 2px, rgba(0,0,0,0.8) 2px 3px)',
          }}
        />
      </div>

      {/* LETTERBOX */}
      <div className="absolute top-0 inset-x-0 h-[5.5vh] bg-black" />
      <div className="absolute bottom-0 inset-x-0 h-[6.5vh] bg-black flex items-center justify-center gap-[3vw] font-gothic text-[clamp(9px,0.85vw,14px)] tracking-[0.25em] uppercase" style={{ color: '#6F6758' }}>
        <span>
          <span style={{ color: PARCHMENT_DIM }}>Select</span> &nbsp;{isTypingComplete ? (isFinalScene ? (onEmbark ? 'Embark' : 'Close') : 'Continue') : 'Reveal'}
        </span>
        <span style={{ color: '#3A352C' }}>◆</span>
        <span>
          <span style={{ color: PARCHMENT_DIM }}>◀ ▶</span> &nbsp;Chapters
        </span>
        <span style={{ color: '#3A352C' }}>◆</span>
        <span>
          <span style={{ color: PARCHMENT_DIM }}>Back</span> &nbsp;Skip
        </span>
        <span style={{ color: '#3A352C' }}>◆</span>
        <span>Auto</span>
      </div>

      {/* ACT HEADER */}
      <div className="absolute top-[8.5vh] left-[4.5vw] pointer-events-none" style={{ textShadow: TEXT_SHADOW }}>
        <div className="flex items-center gap-3 font-gothic font-bold text-[clamp(9px,0.9vw,15px)] tracking-[0.45em]" style={{ color: '#C9A45C' }}>
          <span>{lore.actRoman}</span>
          <span className="h-px w-[3vw]" style={{ background: 'linear-gradient(to right, #C9A45C, transparent)' }} />
        </div>
        <h1
          className="font-gothic font-bold uppercase leading-none mt-[0.8vh] text-[clamp(18px,2.4vw,40px)] tracking-[0.12em]"
          style={{ color: PARCHMENT }}
        >
          {lore.stageName}
        </h1>
        <p className="font-tome italic text-[clamp(12px,1.25vw,22px)] mt-[0.5vh]" style={{ color: PARCHMENT_DIM }}>
          {lore.epithet}
        </p>
      </div>

      {/* CHAPTER TRACKER */}
      <div className="absolute top-[8.5vh] right-[4.5vw] flex items-center gap-[1.4vw] font-gothic font-bold text-[clamp(10px,1vw,17px)] tracking-[0.15em] pointer-events-none" style={{ textShadow: TEXT_SHADOW }}>
        {lore.scenes.map((s, idx) => {
          const active = idx === sceneIndex;
          return (
            <div key={idx} className="flex flex-col items-center gap-[0.6vh]">
              <span
                className="transition-colors duration-500"
                style={{ color: active ? MOOD[s.mood].accent : idx < sceneIndex ? PARCHMENT_DIM : '#4A443A' }}
              >
                {ROMAN[idx] ?? idx + 1}
              </span>
              <span
                className="w-[5px] h-[5px] rotate-45 transition-all duration-500"
                style={{
                  background: active ? MOOD[s.mood].accent : 'transparent',
                  border: `1px solid ${active ? MOOD[s.mood].accent : '#4A443A'}`,
                  boxShadow: active ? `0 0 8px ${MOOD[s.mood].accent}` : 'none',
                }}
              />
            </div>
          );
        })}
      </div>

      {/* NARRATION */}
      <div className="absolute inset-x-0 bottom-[9.5vh] flex justify-center px-[6vw] pointer-events-none">
        <div key={sceneIndex} className="w-full max-w-[68vw] text-center" style={{ textShadow: TEXT_SHADOW }}>
          <div className="kk-cine-rise flex items-center justify-center gap-4">
            <Ornament color={mood.accent} />
            <span
              className="font-gothic font-bold uppercase text-[clamp(9px,0.9vw,15px)] tracking-[0.4em] whitespace-nowrap"
              style={{ color: mood.accent }}
            >
              {kicker || mood.label}
              {kicker && <span style={{ color: PARCHMENT_DIM }}> &nbsp;·&nbsp; {mood.label}</span>}
            </span>
            <Ornament color={mood.accent} flip />
          </div>

          <h2
            className="kk-cine-rise font-gothic font-bold uppercase mt-[1.6vh] text-[clamp(18px,2.3vw,40px)] tracking-[0.08em] leading-tight"
            style={{ color: PARCHMENT, animationDelay: '0.12s', textShadow: `${TEXT_SHADOW}, 0 0 24px ${mood.glow}` }}
          >
            {title}
          </h2>
          <p
            className="kk-cine-rise font-tome italic font-medium mt-[0.6vh] text-[clamp(14px,1.45vw,26px)]"
            style={{ color: mood.accent, animationDelay: '0.22s' }}
          >
            {scene.subtitle}
          </p>

          <p
            className="font-tome font-medium mt-[2.4vh] text-[clamp(16px,1.75vw,30px)] leading-[1.55] tracking-[0.01em]"
            style={{ color: PARCHMENT }}
          >
            {words.map((w, i) => (
              <span key={i} className={`kk-cine-word ${i < shownWords ? 'kk-cine-word--in' : ''}`}>
                {w}{' '}
              </span>
            ))}
          </p>

          {epigraph && (
            <p
              className={`font-tome italic mt-[2vh] text-[clamp(13px,1.3vw,23px)] leading-snug transition-opacity duration-700 ${isTypingComplete ? 'opacity-100' : 'opacity-0'}`}
              style={{ color: mood.accent }}
            >
              {epigraph}
            </p>
          )}

          {/* Continue mark */}
          <div className={`mt-[2vh] h-[2.2vh] flex justify-center transition-opacity duration-500 ${isTypingComplete ? 'opacity-100' : 'opacity-0'}`}>
            {isFinalScene ? (
              <span
                className="kk-cine-prompt font-gothic font-bold uppercase text-[clamp(10px,1vw,17px)] tracking-[0.5em]"
                style={{ color: mood.accent }}
              >
                ◆ {onEmbark ? 'Take up the iron' : 'The chronicle ends'} ◆
              </span>
            ) : (
              <svg className="kk-cine-prompt" width="18" height="12" viewBox="0 0 18 12" aria-hidden>
                <path d="M1 1 L9 10 L17 1" fill="none" stroke={mood.accent} strokeWidth="2" />
              </svg>
            )}
          </div>

          {/* Auto-advance: a hairline burns down while the page is held; when it runs out, the chapter turns
              (on the last chapter, the expedition begins) */}
          <div className="mt-[1vh] mx-auto w-[14vw] h-px" style={{ background: 'rgba(255,255,255,0.08)' }}>
            {isTypingComplete && (
              <div
                key={sceneIndex}
                className="kk-cine-hold h-full mx-auto"
                style={{
                  background: mood.accent,
                  boxShadow: `0 0 6px ${mood.accent}`,
                  animationDuration: `${holdSeconds}s`,
                }}
                onAnimationEnd={handleNext}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
