import { IS_NATIVE_APP } from './native';

/**
 * Video graphics setting (title screen menu). PERFORMANCE trades a few effects for frame rate on weak Fire TV
 * GPUs (Mali-G31 sticks run battle at ~25 fps with everything on). It sets `data-gfx` on <html>; the CSS
 * overrides live under `:root[data-gfx='performance']` in src/index.css, and GameEngine checks
 * `isPerformanceMode()` for its own savers (the default monster outline pass).
 */
export type GraphicsMode = 'QUALITY' | 'PERFORMANCE';

const STORAGE_KEY = 'kk_graphics_mode';

// Fire TV model codes (the UA's device model) whose GPU runs the full effects: Cube 2nd/3rd gen (Mali-G52 MP2),
// Stick 4K Max 1st/2nd gen and Stick 4K 2nd gen (PowerVR GE9215, 2 GB).
const HIGH_END_FIRE_TV = new Set(['AFTR', 'AFTGAZL', 'AFTKA', 'AFTKM', 'AFTKRT']);
// Older or 1 GB devices: Stick Lite / 3rd gen (Mali-G31), Stick 4K 1st gen, and everything from 2014–2017.
const LOW_END_FIRE_TV = new Set(['AFTSS', 'AFTSSS', 'AFTMM', 'AFTT', 'AFTM', 'AFTB', 'AFTS', 'AFTN', 'AFTA']);

/**
 * Default when nothing is saved. Browsers (desktop /tv demo) get QUALITY. On a Fire TV (the app, or Silk) the
 * model code decides; an unknown model (Fire TV Edition sets, newer sticks) gets QUALITY only with 2+ GB of RAM
 * and 4+ cores.
 */
function detectDefaultMode(): GraphicsMode {
  const model = /\b(AFT[A-Z0-9]+)\b/.exec(navigator.userAgent)?.[1];
  if (!model && !IS_NATIVE_APP) return 'QUALITY';
  if (model && HIGH_END_FIRE_TV.has(model)) return 'QUALITY';
  if (model && LOW_END_FIRE_TV.has(model)) return 'PERFORMANCE';
  const memoryGb = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 0;
  return memoryGb >= 2 && navigator.hardwareConcurrency >= 4 ? 'QUALITY' : 'PERFORMANCE';
}

let mode: GraphicsMode = detectDefaultMode();

function apply(): void {
  document.documentElement.dataset.gfx = mode.toLowerCase();
}

/** Reads the saved setting and applies it. Call once at startup, before the first render. */
export function installGraphicsMode(): void {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'QUALITY' || saved === 'PERFORMANCE') mode = saved;
  } catch {
    // Storage blocked: keep the default.
  }
  apply();
}

export function getGraphicsMode(): GraphicsMode {
  return mode;
}

export function isPerformanceMode(): boolean {
  return mode === 'PERFORMANCE';
}

export function setGraphicsMode(next: GraphicsMode): void {
  mode = next;
  apply();
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Storage blocked: the setting lasts for this session only.
  }
}
